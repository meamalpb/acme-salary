require "rails_helper"

RSpec.describe DemoData do
  describe ".reset" do
    it "removes every employee, terminated ones included, and returns how many" do
      create_list(:employee, 2)
      create(:employee, deleted_at: Time.zone.local(2026, 9, 1))

      expect(described_class.reset).to eq(3)
      expect(Employee.with_deleted.count).to eq(0)
    end

    it "leaves HR users alone" do
      create(:user)
      expect { described_class.reset }.not_to change(User, :count)
    end
  end

  describe ".seed" do
    it "creates the requested number of employees, some of them terminated" do
      expect(described_class.seed(count: 200)).to eq(200)

      expect(Employee.with_deleted.count).to eq(200)
      expect(Employee.only_deleted.count).to be_positive
    end

    it "does nothing while employees already exist" do
      create(:employee)

      expect(described_class.seed(count: 50)).to eq(0)
      expect(Employee.with_deleted.count).to eq(1)
    end

    it "can seed again after a reset" do
      described_class.seed(count: 20)
      described_class.reset

      expect(described_class.seed(count: 20)).to eq(20)
    end
  end
end
