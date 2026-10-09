require "rails_helper"

RSpec.describe ExportEmployeesCsv do
  let(:header) { "employee_code,full_name,email,gender,job_title,department,level,country,hire_date,salary" }

  def lines(csv) = csv.split("\r\n")

  it "writes a header and one row per employee in the scope's order" do
    create(:employee, employee_code: "EMP-00002", full_name: "Zed", email: "zed@acme.test", salary: 50_000)
    create(:employee, employee_code: "EMP-00001", full_name: "Amy", email: "amy@acme.test", salary: 40_000)

    csv = described_class.call(Employee.order(:full_name))

    expect(lines(csv)).to eq [
      header,
      "EMP-00001,Amy,amy@acme.test,female,Backend Engineer,engineering,senior,india,2021-03-15,40000",
      "EMP-00002,Zed,zed@acme.test,female,Backend Engineer,engineering,senior,india,2021-03-15,50000"
    ]
  end

  it "returns only the header for an empty scope" do
    expect(lines(described_class.call(Employee.none))).to eq [ header ]
  end

  it "quotes fields containing commas, quotes or newlines" do
    create(:employee, full_name: %(Doe, "Jo"\nSmith))

    row = described_class.call(Employee.all).split("\r\n", 2).last

    expect(row).to include(%(,"Doe, ""Jo""\nSmith",))
  end

  it "prefixes formula-looking text so spreadsheets do not execute it" do
    create(:employee, full_name: "=HYPERLINK(\"http://evil\")", job_title: "+cmd", email: "a@acme.test")

    row = lines(described_class.call(Employee.all)).last

    expect(row).to include(%("'=HYPERLINK(""http://evil"")"))
    expect(row).to include(",'+cmd,")
  end

  context "with include_terminated" do
    it "adds a terminated_on column holding the termination date" do
      create(:employee, employee_code: "EMP-00001", full_name: "Gone", deleted_at: Time.zone.local(2026, 5, 1, 9))
      create(:employee, employee_code: "EMP-00002", full_name: "Here", email: "here@acme.test")

      csv = described_class.call(Employee.with_deleted.order(:full_name), include_terminated: true)

      expect(lines(csv)).to eq [
        "#{header},terminated_on",
        "EMP-00001,Gone,#{Employee.with_deleted.find_by(employee_code: 'EMP-00001').email},female,Backend Engineer,engineering,senior,india,2021-03-15,38500,2026-05-01",
        "EMP-00002,Here,here@acme.test,female,Backend Engineer,engineering,senior,india,2021-03-15,38500,"
      ]
    end
  end
end
