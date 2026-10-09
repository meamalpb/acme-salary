require "rails_helper"
require Rails.root.join("db/seeds/employee_generator")

RSpec.describe EmployeeGenerator do
  let(:reference_date) { Date.new(2026, 10, 1) }

  def generate(count: 2_000, seed: 42)
    described_class.new(count: count, seed: seed, reference_date: reference_date).call
  end

  def share(rows, key, value)
    rows.count { |row| row[key] == value }.fdiv(rows.size)
  end

  describe ".salary" do
    let(:rng) { Random.new(1) }

    it "is a whole number of dollars rounded to the nearest 100" do
      salaries = 200.times.map { described_class.salary(level: "senior", country: "united_states", rng: rng) }

      expect(salaries).to all(be_a(Integer))
      expect(salaries).to all(satisfy { |salary| (salary % 100).zero? })
    end

    it "stays within ±15% of level base × country multiplier" do
      salaries = 500.times.map { described_class.salary(level: "senior", country: "germany", rng: rng) }
      midpoint = 120_000 * 0.80

      expect(salaries.min).to be >= (midpoint * 0.85 - 50)
      expect(salaries.max).to be <= (midpoint * 1.15 + 50)
      expect(salaries.uniq.size).to be > 1
    end

    it "is higher for senior levels and for higher-paying countries" do
      average = lambda do |level, country|
        samples = 300.times.map { described_class.salary(level: level, country: country, rng: rng) }
        samples.sum.fdiv(samples.size)
      end

      expect(average.call("principal", "india")).to be > average.call("junior", "india")
      expect(average.call("mid", "united_states")).to be > average.call("mid", "india")
    end

    it "gives the same salary for the same rng state" do
      first = described_class.salary(level: "lead", country: "canada", rng: Random.new(7))
      second = described_class.salary(level: "lead", country: "canada", rng: Random.new(7))

      expect(first).to eq(second)
    end
  end

  describe "#call" do
    it "returns the requested number of rows" do
      expect(generate(count: 150).size).to eq(150)
    end

    it "is identical for the same seed and different for another seed" do
      expect(generate(count: 300)).to eq(generate(count: 300))
      expect(generate(count: 300, seed: 43)).not_to eq(generate(count: 300, seed: 42))
    end

    it "numbers employee codes EMP-00001 upwards and keeps codes and emails unique" do
      rows = generate

      expect(rows.first[:employee_code]).to eq("EMP-00001")
      expect(rows.last[:employee_code]).to eq("EMP-02000")
      expect(rows.map { |row| row[:employee_code] }.uniq.size).to eq(rows.size)
      expect(rows.map { |row| row[:email] }.uniq.size).to eq(rows.size)
    end

    it "produces rows the Employee model accepts" do
      generate(count: 100).each do |row|
        employee = Employee.new(row.except(:deleted_at))

        expect(employee).to be_valid, "#{row[:employee_code]}: #{employee.errors.full_messages.to_sentence}"
      end
    end

    it "uses only the fixed lists" do
      rows = generate

      expect(rows.map { |row| row[:country] }.uniq).to all(be_in(Employee.countries.keys))
      expect(rows.map { |row| row[:department] }.uniq).to all(be_in(Employee.departments.keys))
      expect(rows.map { |row| row[:level] }.uniq).to all(be_in(Employee.levels.keys))
      expect(rows.map { |row| row[:gender] }.uniq).to all(be_in(Employee.genders.keys))
    end

    it "gives a level pyramid: many juniors, few principals" do
      rows = generate

      expect(share(rows, :level, "junior")).to be_within(0.04).of(0.30)
      expect(share(rows, :level, "mid")).to be_within(0.04).of(0.30)
      expect(share(rows, :level, "principal")).to be_within(0.03).of(0.06)
    end

    it "gives uneven headcount across countries" do
      rows = generate

      expect(share(rows, :country, "india")).to be_within(0.04).of(0.30)
      expect(share(rows, :country, "united_states")).to be_within(0.04).of(0.22)
      expect(share(rows, :country, "brazil")).to be_within(0.03).of(0.05)
    end

    it "weights engineering as the largest department" do
      rows = generate

      expect(share(rows, :department, "engineering")).to be > share(rows, :department, "sales")
      expect(share(rows, :department, "sales")).to be > share(rows, :department, "hr")
    end

    it "never hires after the reference date" do
      expect(generate.map { |row| row[:hire_date] }.max).to be <= reference_date
    end

    it "terminates about 3% of employees, never before hire and never after the reference date" do
      rows = generate
      terminated = rows.select { |row| row[:deleted_at] }

      expect(terminated.size.fdiv(rows.size)).to be_within(0.015).of(0.03)
      terminated.each do |row|
        expect(row[:deleted_at].to_date).to be >= row[:hire_date]
        expect(row[:deleted_at].to_date).to be <= reference_date
      end
    end

    it "has no deleted_at on active employees" do
      expect(generate.reject { |row| row[:deleted_at] }).not_to be_empty
    end
  end
end
