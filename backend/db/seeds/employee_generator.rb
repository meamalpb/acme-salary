require "faker"

# Builds deterministic, realistic employee rows for db/seeds.rb (not autoloaded; seeds.rb requires it).
# salary = level base × country multiplier × random(0.85..1.15), rounded to the nearest 100.
# Names come from Faker's locale for the employee's country.
# Everything random, Faker included, comes from one Random seeded in the constructor, so a run is repeatable
# (for a given Faker version: its name lists are part of the output).
# Dates are relative to a fixed reference date (not today), which keeps output identical across days.
class EmployeeGenerator
  REFERENCE_DATE = Date.new(2026, 10, 1)
  FIRST_HIRE_DATE = Date.new(2015, 1, 1)
  TERMINATED_SHARE = 0.03
  MIN_TENURE_DAYS = 30

  LEVEL_BASE = { "junior" => 60_000, "mid" => 85_000, "senior" => 120_000, "lead" => 150_000, "principal" => 190_000 }.freeze
  LEVEL_SHARE = { "junior" => 0.30, "mid" => 0.30, "senior" => 0.22, "lead" => 0.12, "principal" => 0.06 }.freeze

  COUNTRY_MULTIPLIER = {
    "india" => 0.30, "united_states" => 1.00, "united_kingdom" => 0.75, "germany" => 0.80,
    "canada" => 0.85, "australia" => 0.85, "singapore" => 0.80, "brazil" => 0.40
  }.freeze
  COUNTRY_SHARE = {
    "india" => 0.30, "united_states" => 0.22, "united_kingdom" => 0.12, "germany" => 0.10,
    "canada" => 0.08, "australia" => 0.07, "singapore" => 0.06, "brazil" => 0.05
  }.freeze

  DEPARTMENT_SHARE = {
    "engineering" => 0.40, "sales" => 0.20, "operations" => 0.14,
    "marketing" => 0.10, "finance" => 0.10, "hr" => 0.06
  }.freeze
  JOB_TITLES = {
    "engineering" => [ "Backend Engineer", "Frontend Engineer", "QA Engineer", "DevOps Engineer", "Data Engineer" ],
    "sales" => [ "Account Executive", "Sales Development Rep", "Customer Success Manager", "Solutions Consultant" ],
    "operations" => [ "Operations Analyst", "Support Specialist", "Logistics Coordinator", "Program Manager" ],
    "marketing" => [ "Content Strategist", "Growth Marketer", "Brand Designer", "Product Marketing Manager" ],
    "finance" => [ "Financial Analyst", "Accountant", "Payroll Specialist", "Controller" ],
    "hr" => [ "Recruiter", "HR Business Partner", "People Operations Specialist", "Talent Partner" ]
  }.freeze

  GENDER_SHARE = { "female" => 0.47, "male" => 0.47, "non_binary" => 0.03, "prefer_not_to_say" => 0.03 }.freeze
  EMAIL_DOMAIN = "acme.test".freeze

  # Public so the pay formula can be tested on its own.
  def self.salary(level:, country:, rng:)
    ((LEVEL_BASE.fetch(level) * COUNTRY_MULTIPLIER.fetch(country) * rng.rand(0.85..1.15)) / 100.0).round * 100
  end

  def initialize(count:, seed: 42, reference_date: REFERENCE_DATE)
    @count = count
    @rng = Random.new(seed)
    @reference_date = reference_date
    @used_emails = Set.new
  end

  # Faker's random is global (per thread), so it's pointed at @rng only for the duration of the run.
  def call
    previous_random = Faker::Config.random
    Faker::Config.random = @rng
    Array.new(@count) { |index| build_row(index + 1) }
  ensure
    Faker::Config.random = previous_random
  end

  private

  def build_row(number)
    gender = pick(GENDER_SHARE)
    department = pick(DEPARTMENT_SHARE)
    level = pick(LEVEL_SHARE)
    country = pick(COUNTRY_SHARE)
    first_name, last_name = name_for(gender, country)
    hire_date = random_hire_date

    {
      employee_code: format("EMP-%05d", number),
      full_name: "#{first_name} #{last_name}",
      email: unique_email(first_name, last_name),
      gender: gender,
      job_title: JOB_TITLES.fetch(department).sample(random: @rng),
      department: department,
      level: level,
      country: country,
      hire_date: hire_date,
      salary: self.class.salary(level: level, country: country, rng: @rng),
      deleted_at: termination_time(hire_date)
    }
  end

  # Weighted choice. Always draws exactly one number so the stream stays predictable.
  def pick(shares)
    roll = @rng.rand * shares.values.sum
    shares.each do |value, share|
      roll -= share
      return value if roll.negative?
    end
    shares.keys.last
  end

  def name_for(gender, country)
      first_name = case gender
      when "female" then Faker::Name.female_first_name
      when "male" then Faker::Name.male_first_name
      else Faker::Name.first_name
      end
     [ first_name, Faker::Name.last_name ]
  end

  # first.last@acme.test, with a counter added when that address is already taken.
  def unique_email(first_name, last_name)
    base = "#{first_name}.#{last_name}".downcase.unicode_normalize(:nfd).gsub(/[^a-z.]/, "")
    email = "#{base}@#{EMAIL_DOMAIN}"
    suffix = 1
    email = "#{base}#{suffix += 1}@#{EMAIL_DOMAIN}" while @used_emails.include?(email)
    @used_emails << email
    email
  end

  def random_hire_date
    FIRST_HIRE_DATE + @rng.rand((@reference_date - FIRST_HIRE_DATE).to_i + 1)
  end

  # Terminated employees need at least MIN_TENURE_DAYS between hire and termination.
  def termination_time(hire_date)
    return nil unless @rng.rand < TERMINATED_SHARE

    window = (@reference_date - hire_date).to_i - MIN_TENURE_DAYS
    return nil if window.negative?

    (hire_date + MIN_TENURE_DAYS + @rng.rand(window + 1)).in_time_zone
  end
end
