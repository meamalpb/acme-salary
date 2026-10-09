class EmployeeSerializer
  include Alba::Resource

  attributes :id, :employee_code, :full_name, :email, :gender, :job_title,
             :department, :level, :country, :hire_date, :salary

  # deleted_at is the termination date; it is exposed as a plain date and never as deleted_at.
  attribute :terminated_on do |employee|
    employee.deleted_at&.to_date
  end
end
