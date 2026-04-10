.PHONY: dev

dev:
	@trap 'kill 0' EXIT; \
	(cd backend && go run .) & \
	(cd frontend && npm run dev) & \
	wait
