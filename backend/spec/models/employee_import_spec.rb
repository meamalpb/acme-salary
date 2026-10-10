require "rails_helper"

RSpec.describe EmployeeImport, type: :model do
  it { is_expected.to belong_to(:user) }

  it "starts queued, with nothing created and no errors" do
    employee_import = create(:employee_import)

    expect(employee_import.reload).to have_attributes(status: "queued", created_count: 0, row_errors: [],
                                                      error_message: nil)
  end

  it "accepts every status" do
    %w[queued processing succeeded failed].each do |status|
      expect(build(:employee_import, status: status)).to be_valid, "expected #{status} to be valid"
    end
  end

  it "rejects an unknown status" do
    employee_import = build(:employee_import, status: "paused")

    expect(employee_import).not_to be_valid
    expect(employee_import.errors[:status]).to be_present
  end
end
