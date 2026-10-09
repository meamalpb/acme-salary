require "rails_helper"

RSpec.describe "Meta", type: :request do
  describe "GET /api/v1/meta" do
    it "requires a token" do
      get "/api/v1/meta"

      expect(response).to have_http_status(:unauthorized)
    end

    it "returns the fixed lists as value and label pairs" do
      get "/api/v1/meta", headers: auth_headers

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body.keys).to contain_exactly("countries", "departments", "levels", "genders")
      expect(body["countries"]).to include({ "value" => "united_states", "label" => "United States" })
      expect(body["levels"].map { |l| l["value"] }).to eq(%w[junior mid senior lead principal])
      expect(body["departments"].size).to eq(6)
      expect(body["genders"].size).to eq(4)
    end
  end
end
