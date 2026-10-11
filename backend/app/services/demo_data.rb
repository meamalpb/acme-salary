require Rails.root.join("db/seeds/employee_generator")

# Wipes and refills the employee table for demos. Shared by db/seeds.rb and the demo endpoints.
class DemoData
  DEFAULT_COUNT = 10_000

  # Hard-deletes every employee, terminated ones included (paranoia would only soft-delete). Returns how many.
  def self.reset
    Employee.with_deleted.delete_all
  end

  # Creates employees only into an empty table. Returns how many were created (0 when employees already exist).
  def self.seed(count: DEFAULT_COUNT)
    return 0 if Employee.with_deleted.exists?

    rows = EmployeeGenerator.new(count: count).call
    Employee.transaction do
      # unscoped: paranoia's default scope would otherwise overwrite deleted_at with NULL.
      rows.each_slice(1_000) { |batch| Employee.unscoped.insert_all!(batch) }
    end
    rows.size
  end
end
