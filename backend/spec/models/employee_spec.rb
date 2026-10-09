require "rails_helper"

RSpec.describe Employee, type: :model do
  describe "factory" do
    it "builds a valid employee" do
      expect(build(:employee)).to be_valid
    end
  end

  describe "validations" do
    describe "presence" do
      it { is_expected.to validate_presence_of(:employee_code) }
      it { is_expected.to validate_presence_of(:full_name) }
      it { is_expected.to validate_presence_of(:email) }
      it { is_expected.to validate_presence_of(:job_title) }
      it { is_expected.to validate_presence_of(:hire_date) }
      it { is_expected.to validate_presence_of(:salary) }
    end

    describe "email" do
      it "accepts a well-formed address" do
        expect(build(:employee, email: "priya.sharma@acme.test")).to be_valid
      end

      it "rejects a malformed address" do
        employee = build(:employee, email: "not-an-email")

        expect(employee).not_to be_valid
        expect(employee.errors[:email]).to be_present
      end

      it "is unique regardless of case" do
        create(:employee, email: "priya@acme.test")
        duplicate = build(:employee, email: "PRIYA@acme.test")

        expect(duplicate).not_to be_valid
        expect(duplicate.errors[:email]).to include("has already been taken")
      end

      it "is stored lowercase and stripped" do
        employee = create(:employee, email: "  Priya@Acme.Test ")

        expect(employee.reload.email).to eq("priya@acme.test")
      end
    end

    describe "employee_code" do
      it "is unique" do
        create(:employee, employee_code: "EMP-00001")
        duplicate = build(:employee, employee_code: "EMP-00001")

        expect(duplicate).not_to be_valid
        expect(duplicate.errors[:employee_code]).to include("has already been taken")
      end
    end

    describe "salary" do
      it "must be an integer" do
        employee = build(:employee, salary: 1000.5)

        expect(employee).not_to be_valid
        expect(employee.errors[:salary]).to include("must be an integer")
      end

      it "must be greater than 0" do
        expect(build(:employee, salary: 0)).not_to be_valid
        expect(build(:employee, salary: -1)).not_to be_valid
        expect(build(:employee, salary: 1)).to be_valid
      end
    end

    describe "hire_date" do
      around { |example| travel_to(Time.zone.local(2026, 10, 9, 12), &example) }

      it "may be today" do
        expect(build(:employee, hire_date: Date.new(2026, 10, 9))).to be_valid
      end

      it "may not be in the future" do
        employee = build(:employee, hire_date: Date.new(2026, 10, 10))

        expect(employee).not_to be_valid
        expect(employee.errors[:hire_date]).to include("can't be in the future")
      end
    end
  end

  describe "enums" do
    {
      country: %w[india united_states united_kingdom germany canada australia singapore brazil],
      department: %w[engineering sales marketing hr finance operations],
      level: %w[junior mid senior lead principal],
      gender: %w[female male non_binary prefer_not_to_say]
    }.each do |attribute, values|
      describe attribute.to_s do
        it "accepts every allowed value" do
          values.each do |value|
            expect(build(:employee, attribute => value)).to be_valid, "expected #{value} to be valid"
          end
        end

        it "rejects an unknown value" do
          employee = build(:employee, attribute => "atlantis")

          expect(employee).not_to be_valid
          expect(employee.errors[attribute]).to be_present
        end

        it "stores the readable slug in the database" do
          employee = create(:employee, attribute => values.first)

          stored = Employee.connection.select_value("SELECT #{attribute} FROM employees WHERE id = #{employee.id}")
          expect(stored).to eq(values.first)
        end
      end
    end
  end

  describe "soft delete" do
    let!(:active) { create(:employee) }
    let!(:terminated) { create(:employee, deleted_at: Time.zone.local(2026, 9, 1)) }

    it "excludes terminated employees from the default scope" do
      expect(Employee.all).to contain_exactly(active)
    end

    it "includes them in only_deleted" do
      expect(Employee.only_deleted).to contain_exactly(terminated)
    end

    it "can still find them with with_deleted" do
      expect(Employee.with_deleted).to contain_exactly(active, terminated)
    end
  end

  describe "read-only once terminated" do
    let(:terminated) do
      create(:employee).tap { |employee| employee.update_columns(deleted_at: Time.zone.local(2026, 9, 1)) }
    end

    it "rejects updates" do
      record = Employee.with_deleted.find(terminated.id)

      expect(record.update(salary: 99_000)).to be(false)
      expect(record.errors[:base]).to include("Terminated employees are read-only")
      expect(record.reload.salary).to eq(38_500)
    end
  end
end
