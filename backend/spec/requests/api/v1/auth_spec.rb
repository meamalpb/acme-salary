require "rails_helper"

RSpec.describe "Auth", type: :request do
  let!(:user) { create(:user, email: "hr@acme.test", password: "password123") }

  def login(email: "hr@acme.test", password: "password123")
    post "/api/v1/login", params: { user: { email: email, password: password } }, as: :json
  end

  def bearer_headers
    { "Authorization" => response.headers["Authorization"] }
  end

  describe "POST /api/v1/login" do
    it "returns the user and a bearer token in the Authorization header" do
      login

      expect(response).to have_http_status(:ok)
      expect(response.headers["Authorization"]).to start_with("Bearer ")
      expect(response.parsed_body).to eq("user" => { "id" => user.id, "email" => "hr@acme.test" })
    end

    it "ignores email case" do
      login(email: "HR@Acme.test")

      expect(response).to have_http_status(:ok)
    end

    it "rejects a wrong password with the 401 error envelope" do
      login(password: "wrong-password")

      expect(response).to have_http_status(:unauthorized)
      expect(response.headers["Authorization"]).to be_nil
      expect(response.parsed_body["error"]).to include("code" => "unauthorized", "message" => be_present)
      expect(response.parsed_body["error"]).to have_key("details")
    end

    it "rejects an unknown email the same way" do
      login(email: "nobody@acme.test")

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]["code"]).to eq("unauthorized")
    end
  end

  describe "DELETE /api/v1/logout" do
    it "returns 204 and adds the token to the denylist" do
      login
      headers = bearer_headers

      expect { delete "/api/v1/logout", headers: headers }.to change(JwtDenylist, :count).by(1)

      expect(response).to have_http_status(:no_content)
    end

    it "makes the token unusable afterwards" do
      login
      headers = bearer_headers
      delete "/api/v1/logout", headers: headers

      delete "/api/v1/logout", headers: headers

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]["code"]).to eq("unauthorized")
    end

    it "rejects a request without a token" do
      delete "/api/v1/logout"

      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body["error"]["code"]).to eq("unauthorized")
    end

    it "rejects a garbage token" do
      delete "/api/v1/logout", headers: { "Authorization" => "Bearer not-a-jwt" }

      expect(response).to have_http_status(:unauthorized)
    end

    it "rejects an expired token" do
      login
      headers = bearer_headers

      travel_to(25.hours.from_now) do
        delete "/api/v1/logout", headers: headers

        expect(response).to have_http_status(:unauthorized)
        expect(response.parsed_body["error"]["code"]).to eq("unauthorized")
      end
    end
  end
end
