Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Registers the :user Devise mapping for warden and devise-jwt; the routes are ours.
  devise_for :users, skip: :all

  namespace :api do
    namespace :v1 do
      post "login", to: "sessions#create"
      delete "logout", to: "sessions#destroy"

      get "meta", to: "meta#show"
      get "insights/countries", to: "insights#countries"

      resources :employees, only: %i[index show create update] do
        get :export, on: :collection
        post :terminate, on: :member
      end
    end
  end
end
