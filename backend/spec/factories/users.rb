FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "hr#{n}@acme.test" }
    password { "password123" }
  end
end
