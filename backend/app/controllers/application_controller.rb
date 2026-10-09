class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound do
    render_error(code: "not_found", message: "Resource not found", status: :not_found)
  end

  rescue_from ActionController::ParameterMissing do |exception|
    render_error(code: "invalid_param", message: "Missing parameter: #{exception.param}",
                 status: :unprocessable_content, details: { exception.param => [ "is required" ] })
  end

  private

  def render_error(code:, message:, status:, details: {})
    render json: { error: { code: code, message: message, details: details } }, status: status
  end

  def render_validation_failed(record)
    render_error(code: "validation_failed", message: "Validation failed",
                 status: :unprocessable_content, details: record.errors.to_hash)
  end
end
