# Soft-deletes an employee. deleted_at is the termination date, so it can be set
# to a past date, which paranoia's own destroy cannot do. Returns true on success,
# or false with the reason on employee.errors.
class TerminateEmployee
  def self.call(employee, terminated_on: nil)
    new(employee, terminated_on).call
  end

  def initialize(employee, terminated_on)
    @employee = employee
    @terminated_on = terminated_on || Date.current
  end

  def call
    if @employee.deleted?
      @employee.errors.add(:base, Employee::TERMINATED_MESSAGE)
    elsif @terminated_on < @employee.hire_date
      @employee.errors.add(:terminated_on, "can't be before the hire date")
    elsif @terminated_on > Date.current
      @employee.errors.add(:terminated_on, "can't be in the future")
    end
    return false if @employee.errors.any?

    @employee.update_columns(deleted_at: @terminated_on.in_time_zone, updated_at: Time.current)
    true
  end
end
