require "rails_helper"

RSpec.describe SalaryInsightsByCountry do
  def insights_for(country) = described_class.new.call.find { |row| row.country == country }

  it "returns nothing when there are no employees" do
    expect(described_class.new.call).to eq []
  end

  it "reports headcount and total payroll per country" do
    create(:employee, country: "india", salary: 10_000)
    create(:employee, country: "india", salary: 30_000)
    create(:employee, country: "germany", salary: 70_000)

    india = insights_for("india")

    expect(india.headcount).to eq 2
    expect(india.total_payroll).to eq 40_000
    expect(insights_for("germany").total_payroll).to eq 70_000
  end

  it "uses the middle salary as the median for an odd headcount" do
    [ 90_000, 10_000, 30_000 ].each { |salary| create(:employee, country: "india", salary: salary) }

    expect(insights_for("india").median_salary).to eq 30_000
  end

  it "averages the two middle salaries for an even headcount" do
    [ 10_000, 20_000, 30_000, 100_000 ].each { |salary| create(:employee, country: "india", salary: salary) }

    expect(insights_for("india").median_salary).to eq 25_000
  end

  it "rounds a half-dollar median to whole dollars" do
    [ 10_001, 10_002 ].each { |salary| create(:employee, country: "india", salary: salary) }

    expect(insights_for("india").median_salary).to eq 10_002
  end

  it "handles a country with a single employee" do
    employee = create(:employee, country: "canada", salary: 55_000)

    row = insights_for("canada")

    expect([ row.headcount, row.median_salary, row.total_payroll ]).to eq [ 1, 55_000, 55_000 ]
    expect(row.top_paid).to eq(id: employee.id, full_name: employee.full_name, level: "senior", salary: 55_000)
  end

  it "reports the highest paid employee, breaking ties by lowest id" do
    create(:employee, country: "india", salary: 10_000)
    first = create(:employee, country: "india", salary: 90_000, level: "principal")
    create(:employee, country: "india", salary: 90_000)

    expect(insights_for("india").top_paid).to eq(id: first.id, full_name: first.full_name, level: "principal", salary: 90_000)
  end

  it "excludes terminated employees from every figure" do
    create(:employee, country: "india", salary: 10_000)
    create(:employee, country: "india", salary: 500_000, deleted_at: Time.zone.local(2026, 5, 1))
    create(:employee, country: "brazil", salary: 20_000, deleted_at: Time.zone.local(2026, 5, 1))

    rows = described_class.new.call

    expect(rows.map(&:country)).to eq [ "india" ]
    expect(rows.first.total_payroll).to eq 10_000
    expect(rows.first.top_paid[:salary]).to eq 10_000
  end

  it "orders countries alphabetically" do
    %w[singapore brazil india].each { |country| create(:employee, country: country) }

    expect(described_class.new.call.map(&:country)).to eq %w[brazil india singapore]
  end
end
