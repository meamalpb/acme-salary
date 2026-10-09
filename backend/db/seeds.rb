require_relative "seeds/employee_generator"

hr_password = ENV.fetch("SEED_HR_PASSWORD") do
  abort "SEED_HR_PASSWORD must be set in production" if Rails.env.production?
  "password123"
end
hr_emails = ENV.fetch("SEED_HR_EMAILS", "hr1@acme.test,hr2@acme.test,hr3@acme.test").split(",").map(&:strip)

hr_emails.each do |email|
  User.find_or_create_by!(email: email) { |user| user.password = hr_password }
end
puts "HR users: #{hr_emails.join(', ')}"

if Employee.with_deleted.exists?
  puts "Employees already present (#{Employee.with_deleted.count}); skipping."
else
  started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  rows = EmployeeGenerator.new(count: ENV.fetch("SEED_EMPLOYEES", 10_000).to_i).call
  Employee.transaction do
    # unscoped: paranoia's default scope would otherwise overwrite deleted_at with NULL.
    rows.each_slice(1_000) { |batch| Employee.unscoped.insert_all!(batch) }
  end
  elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC) - started
  puts format("Seeded %d employees (%d terminated) in %.1fs",
              rows.size, rows.count { |row| row[:deleted_at] }, elapsed)
end
