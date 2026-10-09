require "rails_helper"

# Runs db/seeds.rb with a small count to check the wiring; the data itself is covered by EmployeeGenerator's spec.
# rubocop:disable RSpec/DescribeClass
RSpec.describe "db/seeds.rb" do
  around do |example|
    original = ENV.to_h.slice("SEED_EMPLOYEES", "SEED_HR_PASSWORD", "SEED_HR_EMAILS")
    ENV["SEED_EMPLOYEES"] = "400"
    ENV["SEED_HR_PASSWORD"] = "seed-password"
    ENV.delete("SEED_HR_EMAILS")
    example.run
  ensure
    %w[SEED_EMPLOYEES SEED_HR_PASSWORD SEED_HR_EMAILS].each { |key| ENV.delete(key) }
    original.each { |key, value| ENV[key] = value }
  end

  def run_seeds
    load Rails.root.join("db/seeds.rb")
  end

  it "creates the HR users, who can log in with the seed password" do
    expect { run_seeds }.to output(/HR users/).to_stdout

    expect(User.pluck(:email)).to contain_exactly("hr1@acme.test", "hr2@acme.test", "hr3@acme.test")
    expect(User.find_by(email: "hr1@acme.test").valid_password?("seed-password")).to be(true)
  end

  it "creates the employees, keeping the terminated ones' termination dates" do
    expect { run_seeds }.to output(/Seeded 400 employees/).to_stdout

    expect(Employee.with_deleted.count).to eq(400)
    expect(Employee.only_deleted.count).to be_between(1, 40)
    expect(Employee.only_deleted.pluck(:deleted_at)).to all(be_present)
  end

  it "does nothing the second time" do
    run_seeds

    expect { run_seeds }.to output(/skipping/).to_stdout
    expect(Employee.with_deleted.count).to eq(400)
    expect(User.count).to eq(3)
  end
end
# rubocop:enable RSpec/DescribeClass
