require "rails_helper"

RSpec.describe ImportEmployeesJob, type: :job do
  let(:header) { "full_name,email,gender,job_title,department,level,country,hire_date,salary" }
  let(:asha) { "Asha Rao,asha@acme.test,female,Backend Engineer,engineering,senior,india,2021-03-15,38500" }
  let(:ben_with_no_salary) { "Ben Ode,ben@acme.test,male,Backend Engineer,engineering,senior,india,2021-03-15,0" }

  def import_of(*rows) = create(:employee_import, content: [ header, *rows ].join("\n") + "\n")

  it "imports the rows, records the outcome and clears the upload" do
    employee_import = import_of(asha)

    described_class.perform_now(employee_import)

    expect(employee_import.reload).to have_attributes(status: "succeeded", created_count: 1, row_errors: [],
                                                      error_message: nil, content: nil)
    expect(Employee.pluck(:email)).to eq [ "asha@acme.test" ]
  end

  it "records row errors, imports nothing and clears the upload when a row is invalid" do
    employee_import = import_of(asha, ben_with_no_salary)

    described_class.perform_now(employee_import)

    expect(employee_import.reload).to have_attributes(
      status: "failed",
      created_count: 0,
      row_errors: [ { "row" => 3, "errors" => { "salary" => [ "must be greater than 0" ] } } ],
      error_message: "Nothing was imported. Fix the rows listed and upload the file again.",
      content: nil
    )
    expect(Employee.count).to eq(0)
  end

  it "shows the import as processing while it runs" do
    employee_import = import_of(asha)
    status_while_running = nil
    allow(ImportEmployeesCsv).to receive(:call).and_wrap_original do |original, text|
      status_while_running = employee_import.reload.status
      original.call(text)
    end

    described_class.perform_now(employee_import)

    expect(status_while_running).to eq("processing")
  end

  it "fails with a try-again message when another writer takes an email during the import" do
    employee_import = import_of(asha)
    allow(ImportEmployeesCsv).to receive(:call).and_raise(ActiveRecord::RecordNotUnique)

    described_class.perform_now(employee_import)

    expect(employee_import.reload).to have_attributes(
      status: "failed",
      error_message: "Employees changed while this file was importing, so nothing was imported. Upload the file again.",
      content: nil
    )
  end

  it "marks the import failed and re-raises on an unexpected error" do
    employee_import = import_of(asha)
    allow(ImportEmployeesCsv).to receive(:call).and_raise("boom")

    expect { described_class.perform_now(employee_import) }.to raise_error(RuntimeError, "boom")
    expect(employee_import.reload).to have_attributes(
      status: "failed",
      error_message: "Something went wrong, so nothing was imported. Upload the file again.",
      content: nil
    )
  end

  it "does not run an import that has already finished" do
    employee_import = import_of(asha)
    employee_import.update!(status: "succeeded", created_count: 1)

    described_class.perform_now(employee_import)

    expect(Employee.count).to eq(0)
    expect(employee_import.reload).to have_attributes(status: "succeeded", created_count: 1)
  end
end
