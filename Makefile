.PHONY: dev

dev:
	@trap 'kill 0' EXIT; \
	(cd backend && \
		WG_DRY_RUN=1 \
		WG_SUBNET=10.8.0.0/24 \
		WG_ENDPOINT=localhost \
		WG_PORT=51820 \
		WG_DNS=1.1.1.1 \
		SECRET_KEY=dev-secret-do-not-use-in-prod \
		go run .) & \
	(cd frontend && npm run dev) & \
	wait
