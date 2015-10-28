##
## Copyright [2013-2015] [Megam Systems]
##
## Licensed under the Apache License, Version 2.0 (the "License");
## you may not use this file except in compliance with the License.
## You may obtain a copy of the License at
##
## http://www.apache.org/licenses/LICENSE-2.0
##
## Unless required by applicable law or agreed to in writing, software
## distributed under the License is distributed on an "AS IS" BASIS,
## WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
## See the License for the specific language governing permissions and
## limitations under the License.
##
class UsersController < NilavuController
  respond_to :html, :js
  include SessionsHelper

  # doesn't require a sign for new and create action, hence skip it.
  skip_before_action :require_signin, only: [:new, :create]

  # doesn't require to catch execption for show
  skip_around_action :catch_exception, only: [:show]

  # stick the api_keys before edit and update action
  before_action :stick_keys, only: [:edit, :update]

  def new
    if session[:auth]
      @email = session[:auth][:email]
    end
  end

  def show
  end

  # This method is used to create a new user,  create a Account for the user using /account call.
  # Upon creating a new account, a session is created for the user and redirect to dash.
  def create
    logger.debug '> Users: create.'
    Api::Accounts.new.create(params) do |acct|
      store_credentials acct
      if "#{Ind.notification.email.password}" != ''
        UserMailer.welcome(acct).deliver_now
      end
      toast_success(cockpits_path, "To get started, click marketplace.")
    end
  end

  # load the current org details and send it the edit.html.erb.
  def edit
    logger.debug '> Users: edit.'
    @account = current_user
    @orgs = Api::Organizations.new.list(params).orgs
  end

  # update any profile information.
  def update
    logger.debug '> Users: update'
    Api::Accounts.new.update(params) do |acct|
      store_credentials acct
      toast_success("","#{Accounts.typenum_to_s(params[:myprofile_type])} updated successfully.")
    end
  end

  def invite
    logger.debug '> Users: Organization invite'
    UserMailer.invite(current_user, session[:org]).deliver_now
    toast_success(root_url, "#{params['email']} invited successfully. ")
  end

  # get the invitees default org_id to add the params[org_id] into the invitee's default org bucket
  # as related organizations. U1 invited U2, so params contains U2 email and U1 orgId.
  # get org_id with email
  # update org
  def accept_invite
    org_res = Api::Organizations.new.list(params).orgs
    org_res[0][:related_orgs] << params[:org_id]
    res = Api::Organizations.new.update(org_res[0])
    toast_success(root_url, "Invitation accepted.")
  end
end
