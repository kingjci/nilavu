class BackupService
	attr_reader :cephs3

	class MegamBackupError < StandardError; end

	class CephConnectFailure < MegamBackupError; end

	class BucketsNotFound < MegamBackupError; end

	class DuplicateBucketError < MegamBackupError; end


	def initialize(parms)
		@cephs3 = S3::Service.new(access_key_id: parms[:access_key], secret_access_key: parms[:secret_key], host: endpoint)
	end


	protected

	def cephs3
		@cephs3
	end

	def endpoint
		Ind.backup.host
	end
end
