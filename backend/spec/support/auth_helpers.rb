module AuthHelpers
  # Builds a valid bearer header for a user without going through the login endpoint.
  def auth_headers(user = create(:user))
    token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}" }
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
end
