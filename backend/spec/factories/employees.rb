FactoryBot.define do
  factory :employee do
    sequence(:employee_code) { |n| format("EMP-%05d", n) }
    sequence(:full_name) { |n| "Employee #{n}" }
    sequence(:email) { |n| "employee#{n}@acme.test" }
    gender { "female" }
    job_title { "Backend Engineer" }
    department { "engineering" }
    level { "senior" }
    country { "india" }
    hire_date { Date.new(2021, 3, 15) }
    salary { 38_500 }
  end
end
