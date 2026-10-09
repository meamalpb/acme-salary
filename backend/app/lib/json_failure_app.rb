# Warden failure app: turns a failed authenticate_user! into the 401 error envelope.
class JsonFailureApp < Devise::FailureApp
  def respond
    self.status = 401
    self.content_type = "application/json"
    self.response_body = {
      error: { code: "unauthorized", message: "Missing, invalid or expired token", details: {} }
    }.to_json
  end
end
