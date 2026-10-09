require "rails_helper"

RSpec.describe User, type: :model do
  it "builds a valid user from the factory" do
    expect(build(:user)).to be_valid
  end

  it { is_expected.to validate_presence_of(:email) }
  it { is_expected.to validate_presence_of(:password) }

  it "has a unique email regardless of case" do
    create(:user, email: "hr@acme.test")

    duplicate = build(:user, email: "HR@acme.test")

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:email]).to include("has already been taken")
  end
end
