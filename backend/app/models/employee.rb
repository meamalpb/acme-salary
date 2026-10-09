class Employee < ApplicationRecord
  TERMINATED_MESSAGE = "Terminated employees are read-only".freeze

  # deleted_at is the termination date. Default scope hides terminated rows;
  acts_as_paranoid

  enum :country, {
    india: "india",
    united_states: "united_states",
    united_kingdom: "united_kingdom",
    germany: "germany",
    canada: "canada",
    australia: "australia",
    singapore: "singapore",
    brazil: "brazil"
  }, prefix: true, validate: true

  enum :department, {
    engineering: "engineering",
    sales: "sales",
    marketing: "marketing",
    hr: "hr",
    finance: "finance",
    operations: "operations"
  }, prefix: true, validate: true

  # Declared in seniority order; the seed script and sorting rely on it.
  enum :level, {
    junior: "junior",
    mid: "mid",
    senior: "senior",
    lead: "lead",
    principal: "principal"
  }, prefix: true, validate: true

  enum :gender, {
    female: "female",
    male: "male",
    non_binary: "non_binary",
    prefer_not_to_say: "prefer_not_to_say"
  }, prefix: true, validate: true

  before_validation :normalize_email

  validates :employee_code, :full_name, :job_title, :hire_date, presence: true
  validates :employee_code, uniqueness: true
  validates :email, presence: true,
                    format: { with: URI::MailTo::EMAIL_REGEXP, allow_blank: true },
                    uniqueness: true
  validates :salary, presence: true,
                     numericality: { only_integer: true, greater_than: 0, allow_nil: true }
  validate :hire_date_not_in_future
  validate :not_terminated, on: :update

  private

  def not_terminated
    errors.add(:base, TERMINATED_MESSAGE) if deleted_at_in_database.present?
  end

  def normalize_email
    self.email = email.to_s.strip.downcase.presence
  end

  def hire_date_not_in_future
    errors.add(:hire_date, "can't be in the future") if hire_date.present? && hire_date > Date.current
  end
end
