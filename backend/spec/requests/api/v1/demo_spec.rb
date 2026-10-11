require "rails_helper"

RSpec.describe "Demo data", type: :request do
  let(:headers) { auth_headers }

  before { stub_const("DemoData::DEFAULT_COUNT", 30) }

  describe "authentication" do
    it "rejects both endpoints without a token" do
      post "/api/v1/demo/seed"
      expect(response).to have_http_status(:unauthorized)
      delete "/api/v1/demo/employees"
      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]["code"]).to eq("unauthorized")
    end
  end

  describe "DELETE /api/v1/demo/employees" do
    it "removes every employee, terminated ones included" do
      create(:employee)
      create(:employee, deleted_at: Time.zone.local(2026, 9, 1))

      delete "/api/v1/demo/employees", headers: headers

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq("deleted_count" => 2)
      expect(Employee.with_deleted.count).to eq(0)
    end
  end

  describe "POST /api/v1/demo/seed" do
    it "seeds employees into an empty database" do
      post "/api/v1/demo/seed", headers: headers

      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to eq("created_count" => 30)
      expect(Employee.with_deleted.count).to eq(30)
    end

    it "returns 422 and changes nothing while employees exist" do
      create(:employee)

      post "/api/v1/demo/seed", headers: headers

      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["error"]["code"]).to eq("employees_exist")
      expect(Employee.with_deleted.count).to eq(1)
    end
  end
end
