class ApplicationController < ActionController::API
  private

  def render_error(code:, message:, status:, details: {})
    render json: { error: { code: code, message: message, details: details } }, status: status
  end
end
