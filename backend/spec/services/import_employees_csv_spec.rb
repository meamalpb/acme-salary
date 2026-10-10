require "rails_helper"

RSpec.describe ImportEmployeesCsv do
  let(:header) { "full_name,email,gender,job_title,department,level,country,hire_date,salary" }
  let(:defaults) do
    { full_name: "Asha Rao", email: "asha@acme.test", gender: "female", job_title: "Backend Engineer",
      department: "engineering", level: "senior", country: "india", hire_date: "2021-03-15", salary: "38500" }
  end

  def row(**overrides) = defaults.merge(overrides).values.join(",")
  def csv(*rows) = [ header, *rows ].join("\n") + "\n"

  describe "a valid file" do
    it "creates one employee per row, continuing the code sequence past terminated employees" do
      create(:employee, employee_code: "EMP-00007").update_columns(deleted_at: Time.zone.local(2026, 9, 1))

      result = described_class.call(csv(row, row(full_name: "Ben Ode", email: "ben@acme.test")))

      expect(result).to be_success
      expect(result.created_count).to eq(2)
      expect(Employee.order(:employee_code).pluck(:employee_code, :full_name))
        .to eq [ [ "EMP-00008", "Asha Rao" ], [ "EMP-00009", "Ben Ode" ] ]
    end

    it "stores every field" do
      described_class.call(csv(row))

      expect(Employee.last).to have_attributes(
        full_name: "Asha Rao", email: "asha@acme.test", gender: "female", job_title: "Backend Engineer",
        department: "engineering", level: "senior", country: "india", hire_date: Date.new(2021, 3, 15),
        salary: 38_500, deleted_at: nil
      )
    end

    it "accepts display labels or values for fixed lists, in any case" do
      described_class.call(csv(row(gender: "Non-binary", department: "HR", level: "PRINCIPAL",
                                   country: "United States")))

      expect(Employee.last).to have_attributes(gender: "non_binary", department: "hr", level: "principal",
                                               country: "united_states")
    end

    it "matches headers loosely and ignores extra columns, including employee_code" do
      text = "﻿Employee Code, Full Name ,EMAIL,Gender,Job Title,Department,Level,Country,Hire Date,Salary,Notes\n" \
             "EMP-77777,Asha Rao,asha@acme.test,female,Backend Engineer,engineering,senior,india,2021-03-15,38500,new\n"

      result = described_class.call(text)

      expect(result).to be_success
      expect(Employee.last).to have_attributes(employee_code: "EMP-00001", full_name: "Asha Rao")
    end

    it "trims spaces around values" do
      described_class.call(csv(row(full_name: "  Asha Rao ", email: " Asha@ACME.test ", salary: " 38500 ")))

      expect(Employee.last).to have_attributes(full_name: "Asha Rao", email: "asha@acme.test", salary: 38_500)
    end

    it "reads quoted values containing commas, quotes and line breaks" do
      described_class.call(csv(row(full_name: %("Rao, ""Asha""\nK"))))

      expect(Employee.last.full_name).to eq(%(Rao, "Asha"\nK))
    end

    it "skips blank lines, including rows of empty cells left by spreadsheets" do
      result = described_class.call(csv(row, "", ",,,,,,,,", row(email: "ben@acme.test")))

      expect(result.created_count).to eq(2)
    end

    it "reads UTF-8 text that arrives as binary, as uploaded files do" do
      described_class.call(csv(row(full_name: "José Núñez")).b)

      expect(Employee.last.full_name).to eq("José Núñez")
    end

    it "accepts Windows line endings" do
      result = described_class.call("#{header}\r\n#{row}\r\n#{row(email: 'ben@acme.test')}\r\n")

      expect(result.created_count).to eq(2)
    end

    it "takes codes at insert time, so an employee added during validation does not collide" do
      added = false
      allow_any_instance_of(Employee).to receive(:valid?).and_wrap_original do |original, *args|
        unless added
          added = true
          create(:employee, employee_code: "EMP-00001", email: "added@acme.test")
        end
        original.call(*args)
      end

      described_class.call(csv(row))

      expect(Employee.order(:employee_code).pluck(:employee_code)).to eq %w[EMP-00001 EMP-00002]
    end
  end

  describe "invalid rows" do
    it "creates nothing and reports errors by spreadsheet row number, where the header is row 1" do
      result = described_class.call(csv(row, row(email: "ben@acme.test", salary: "0")))

      expect(result).not_to be_success
      expect(result.created_count).to eq(0)
      expect(result.row_errors).to eq [ { row: 3, errors: { salary: [ "must be greater than 0" ] } } ]
      expect(Employee.count).to eq(0)
    end

    it "reports every invalid row with all of its errors" do
      result = described_class.call(csv(row(full_name: "", job_title: ""),
                                        row(email: "ben@acme.test"),
                                        row(email: "not-an-email", country: "Atlantis")))

      expect(result.row_errors).to eq [
        { row: 2, errors: { full_name: [ "can't be blank" ], job_title: [ "can't be blank" ] } },
        { row: 4, errors: { email: [ "is invalid" ], country: [ "is not included in the list" ] } }
      ]
    end

    it "rejects hire dates that are not YYYY-MM-DD or not real dates" do
      result = described_class.call(csv(row(hire_date: "15/03/2021"),
                                        row(email: "ben@acme.test", hire_date: "2021-02-30")))

      expect(result.row_errors).to eq [
        { row: 2, errors: { hire_date: [ "must be a date in YYYY-MM-DD format" ] } },
        { row: 3, errors: { hire_date: [ "must be a date in YYYY-MM-DD format" ] } }
      ]
    end

    it "rejects hire dates in the future" do
      travel_to Date.new(2026, 10, 10) do
        result = described_class.call(csv(row(hire_date: "2026-10-11")))

        expect(result.row_errors).to eq [ { row: 2, errors: { hire_date: [ "can't be in the future" ] } } ]
      end
    end

    it "rejects salaries that are not whole numbers" do
      result = described_class.call(csv(row(salary: "38500.50")))

      expect(result.row_errors).to eq [ { row: 2, errors: { salary: [ "must be an integer" ] } } ]
    end

    it "rejects an email already used by an employee, including a terminated one" do
      create(:employee, email: "asha@acme.test").update_columns(deleted_at: Time.zone.local(2026, 9, 1))

      result = described_class.call(csv(row(email: "ASHA@acme.test")))

      expect(result.row_errors).to eq [ { row: 2, errors: { email: [ "has already been taken" ] } } ]
    end

    it "rejects an email repeated in the file, pointing at the row that first used it" do
      result = described_class.call(csv(row, row(email: "ben@acme.test"), row(email: "Asha@acme.test")))

      expect(result.row_errors).to eq [ { row: 4, errors: { email: [ "is also in row 2" ] } } ]
    end

    it "keeps row numbers aligned with the spreadsheet when blank rows are skipped" do
      result = described_class.call(csv(row, "", row(email: "ben@acme.test", salary: "0")))

      expect(result.row_errors).to eq [ { row: 4, errors: { salary: [ "must be greater than 0" ] } } ]
    end
  end

  describe "invalid files" do
    it "rejects an empty file" do
      expect { described_class.call(" \n") }.to raise_error(described_class::InvalidFile, "File is empty")
    end

    it "exposes the problem as details keyed by file" do
      expect { described_class.call("") }.to raise_error(described_class::InvalidFile) do |error|
        expect(error.details).to eq(file: [ "is empty" ])
      end
    end

    it "rejects a file with a header but no employee rows" do
      expect { described_class.call(csv("", ",,,,,,,,")) }
        .to raise_error(described_class::InvalidFile, "File has no employee rows")
    end

    it "rejects a file missing required columns" do
      text = "full_name,email,gender,job_title,department,level,hire_date\n" \
             "Asha Rao,asha@acme.test,female,Backend Engineer,engineering,senior,2021-03-15\n"

      expect { described_class.call(text) }
        .to raise_error(described_class::InvalidFile, "File is missing columns: country, salary")
    end

    it "rejects malformed CSV" do
      expect { described_class.call(csv(%("Asha Rao,asha@acme.test))) }
        .to raise_error(described_class::InvalidFile, /\AFile is not valid CSV/)
    end

    it "rejects text that is not UTF-8" do
      expect { described_class.call(csv(row(full_name: "Jos\xE9".b)).b) }
        .to raise_error(described_class::InvalidFile, 'File must be UTF-8 encoded (in Excel, save as "CSV UTF-8")')
    end

    it "rejects more rows than the limit" do
      stub_const("ImportEmployeesCsv::MAX_ROWS", 2)

      expect { described_class.call(csv(row, row(email: "ben@acme.test"), row(email: "cy@acme.test"))) }
        .to raise_error(described_class::InvalidFile, "File has more than 2 rows")
      expect(Employee.count).to eq(0)
    end

    it "rejects a file over the size limit" do
      stub_const("ImportEmployeesCsv::MAX_BYTES", 100)

      expect { described_class.call(csv(row)) }
        .to raise_error(described_class::InvalidFile, "File is larger than 100 Bytes")
    end
  end

  describe ".check_file!" do
    it "raises InvalidFile for a problem with the whole file" do
      expect { described_class.check_file!(csv("")) }
        .to raise_error(described_class::InvalidFile, "File has no employee rows")
    end

    it "leaves the rows unchecked, so invalid rows still pass" do
      create(:employee, email: "asha@acme.test")

      expect { described_class.check_file!(csv(row, row(email: "ben@acme.test", salary: "0"))) }.not_to raise_error
      expect(Employee.count).to eq(1)
    end
  end
end
