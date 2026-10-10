class EmployeeImportSerializer
  include Alba::Resource

  attributes :id, :status, :filename, :created_count, :row_errors, :error_message, :created_at
end
