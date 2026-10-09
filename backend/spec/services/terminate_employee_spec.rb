require "rails_helper"

RSpec.describe TerminateEmployee do
  around { |example| travel_to(Time.zone.local(2026, 10, 9, 12), &example) }

  let(:employee) { create(:employee, hire_date: Date.new(2021, 3, 15)) }

  it "terminates today by default" do
    expect(described_class.call(employee)).to be(true)

    terminated = Employee.with_deleted.find(employee.id)
    expect(terminated.deleted_at.to_date).to eq(Date.new(2026, 10, 9))
    expect(Employee.all).not_to include(employee)
  end

  it "uses the given termination date" do
    expect(described_class.call(employee, terminated_on: Date.new(2026, 9, 1))).to be(true)

    expect(Employee.with_deleted.find(employee.id).deleted_at.to_date).to eq(Date.new(2026, 9, 1))
  end

  it "allows terminating on the hire date" do
    expect(described_class.call(employee, terminated_on: Date.new(2021, 3, 15))).to be(true)
  end

  it "rejects a date before the hire date" do
    expect(described_class.call(employee, terminated_on: Date.new(2021, 3, 14))).to be(false)

    expect(employee.errors[:terminated_on]).to include("can't be before the hire date")
    expect(Employee.all).to include(employee)
  end

  it "rejects a date in the future" do
    expect(described_class.call(employee, terminated_on: Date.new(2026, 10, 10))).to be(false)

    expect(employee.errors[:terminated_on]).to include("can't be in the future")
    expect(Employee.all).to include(employee)
  end

  it "refuses an employee who is already terminated" do
    described_class.call(employee)
    terminated = Employee.with_deleted.find(employee.id)

    expect(described_class.call(terminated, terminated_on: Date.new(2026, 10, 1))).to be(false)

    expect(terminated.errors[:base]).to include("Terminated employees are read-only")
    expect(terminated.reload.deleted_at.to_date).to eq(Date.new(2026, 10, 9))
  end
end
