require "rails_helper"

RSpec.describe CreateEmployee do
  let(:attributes) { attributes_for(:employee).except(:employee_code) }

  it "creates the employee with the first code, EMP-00001" do
    employee = described_class.call(attributes)

    expect(employee).to be_persisted
    expect(employee.employee_code).to eq("EMP-00001")
  end

  it "assigns the next code in the sequence" do
    create(:employee, employee_code: "EMP-00007")

    expect(described_class.call(attributes).employee_code).to eq("EMP-00008")
  end

  it "counts terminated employees so a code is never reused" do
    terminated = create(:employee, employee_code: "EMP-00009")
    terminated.update_columns(deleted_at: Time.zone.local(2026, 9, 1))

    expect(described_class.call(attributes).employee_code).to eq("EMP-00010")
  end

  it "keeps numbering past five digits" do
    create(:employee, employee_code: "EMP-99999")
    create(:employee, employee_code: "EMP-100000")

    expect(described_class.call(attributes).employee_code).to eq("EMP-100001")
  end

  it "ignores an employee_code supplied by the caller" do
    employee = described_class.call(attributes.merge(employee_code: "EMP-77777"))

    expect(employee.employee_code).to eq("EMP-00001")
  end

  it "returns an unsaved employee with errors when invalid" do
    employee = described_class.call(attributes.merge(salary: 0))

    expect(employee).not_to be_persisted
    expect(employee.errors[:salary]).to be_present
  end

  it "retries once when another writer takes the code first" do
    calls = 0
    allow(Employee).to receive(:with_deleted).and_wrap_original do |original|
      calls += 1
      create(:employee, employee_code: "EMP-00001") if calls == 1
      original.call
    end

    employee = described_class.call(attributes)

    expect(employee).to be_persisted
    expect(employee.employee_code).to eq("EMP-00002")
  end
end
