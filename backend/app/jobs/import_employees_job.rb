class ImportEmployeesJob < ApplicationJob
  queue_as :default

  ROW_ERRORS_MESSAGE = "Nothing was imported. Fix the rows listed and upload the file again.".freeze
  CONFLICT_MESSAGE = "Employees changed while this file was importing, so nothing was imported. Upload the file again.".freeze
  UNEXPECTED_MESSAGE = "Something went wrong, so nothing was imported. Upload the file again.".freeze

  def perform(employee_import)
    # A queue can deliver a job twice.
    return if employee_import.finished?

    employee_import.processing!
    result = ImportEmployeesCsv.call(employee_import.content)

    if result.success?
      finish(employee_import, :succeeded, created_count: result.created_count)
    else
      finish(employee_import, :failed, row_errors: result.row_errors, error_message: ROW_ERRORS_MESSAGE)
    end
  rescue ActiveRecord::RecordNotUnique
    finish(employee_import, :failed, error_message: CONFLICT_MESSAGE)
  rescue StandardError
    finish(employee_import, :failed, error_message: UNEXPECTED_MESSAGE)
    raise
  end

  private

  def finish(employee_import, status, **attributes)
    employee_import.update!(status: status, content: nil, **attributes)
  end
end
