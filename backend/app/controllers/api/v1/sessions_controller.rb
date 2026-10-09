module Api
  module V1
    class SessionsController < BaseController
      skip_before_action :authenticate_user!, only: :create

      def create
        credentials = params.fetch(:user, {})
        user = User.find_for_database_authentication(email: credentials[:email].to_s)

        if user&.valid_password?(credentials[:password].to_s)
          # store: false keeps the user out of any session; devise-jwt turns this sign in into a token.
          sign_in(user, store: false)
          render json: { user: { id: user.id, email: user.email } }
        else
          render_error(code: "unauthorized", message: "Invalid email or password", status: :unauthorized)
        end
      end

      # devise-jwt adds the token's jti to the denylist before this action runs.
      def destroy
        head :no_content
      end
    end
  end
end
