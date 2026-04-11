FROM golang:1.26-alpine AS build
RUN apk add --no-cache gcc musl-dev
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=1 go build -o /wg-admin .

FROM alpine:3.21
RUN apk add --no-cache wireguard-tools iptables iproute2 sqlite
COPY --from=build /wg-admin /app/wg-admin
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
