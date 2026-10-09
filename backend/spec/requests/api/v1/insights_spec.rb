require "rails_helper"

RSpec.describe "Insights", type: :request do
  describe "GET /api/v1/insights/countries" do
    it "requires a token" do
      get "/api/v1/insights/countries"

      expect(response).to have_http_status(:unauthorized)
    end

    it "returns one row per country with the three insights" do
      create(:employee, country: "india", salary: 10_000)
      top = create(:employee, country: "india", salary: 30_000, level: "lead")
      create(:employee, country: "germany", salary: 70_000)

      get "/api/v1/insights/countries", headers: auth_headers

      expect(response).to have_http_status(:ok)
      data = response.parsed_body["data"]
      expect(data.map { |row| row["country"] }).to eq %w[germany india]
      expect(data.last).to eq(
        "country" => "india", "headcount" => 2, "median_salary" => 20_000, "total_payroll" => 40_000,
        "top_paid" => { "id" => top.id, "full_name" => top.full_name, "level" => "lead", "salary" => 30_000 }
      )
    end

    it "returns an empty list when there are no employees" do
      get "/api/v1/insights/countries", headers: auth_headers

      expect(response.parsed_body).to eq("data" => [])
    end
  end
end
