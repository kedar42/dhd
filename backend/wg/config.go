package wg

import "fmt"

// ClientConfig holds the fields needed to render a WireGuard client .conf file.
type ClientConfig struct {
	PrivateKey   string
	Address      string // e.g. "10.8.0.2/32"
	DNS          string
	ServerPubKey string
	Endpoint     string // e.g. "vpn.example.com:51820"
}

// String renders the config as a standard WireGuard .conf file.
func (c ClientConfig) String() string {
	return fmt.Sprintf(`[Interface]
PrivateKey = %s
Address = %s
DNS = %s

[Peer]
PublicKey = %s
Endpoint = %s
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
`, c.PrivateKey, c.Address, c.DNS, c.ServerPubKey, c.Endpoint)
}
