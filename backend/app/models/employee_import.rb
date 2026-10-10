class EmployeeImport < ApplicationRecord
  belongs_to :user

  enum :status, {
    queued: "queued",
    processing: "processing",
    succeeded: "succeeded",
    failed: "failed"
  }, validate: true

  def finished?
    succeeded? || failed?
  end
end
