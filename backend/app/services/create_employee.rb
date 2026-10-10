# Creates an employee and assigns the next EMP-%05d code.
# The unique index is the backstop for concurrent creates: if another writer takes
# the code first, the code is recomputed and the insert retried once.
class CreateEmployee
  CODE_PREFIX = "EMP-".freeze
  CODE_NUMBER_SQL = Arel.sql("CAST(SUBSTR(employee_code, #{CODE_PREFIX.length + 1}) AS INTEGER)")

  def self.call(attributes)
    new(attributes).call
  end

  # Highest code number in use. Terminated employees count too, so a code is never reused.
  def self.last_code_number
    Employee.with_deleted.maximum(CODE_NUMBER_SQL).to_i
  end

  def self.code_for(number)
    format("#{CODE_PREFIX}%05d", number)
  end

  def initialize(attributes)
    @attributes = attributes.to_h.symbolize_keys.except(:employee_code)
  end

  def call
    attempts = 0
    begin
      attempts += 1
      Employee.transaction do
        employee = Employee.new(@attributes.merge(employee_code: next_code))
        employee.save
        employee
      end
    rescue ActiveRecord::RecordNotUnique
      retry if attempts < 2
      raise
    end
  end

  private

  def next_code
    self.class.code_for(self.class.last_code_number + 1)
  end
end
