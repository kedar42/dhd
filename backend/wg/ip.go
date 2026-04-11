package wg

import (
	"database/sql"
	"encoding/binary"
	"errors"
	"fmt"
	"net"
)

var ErrSubnetFull = errors.New("no available IPs in subnet")

// AllocateIP finds the next available IP in the configured subnet.
// Reserves .0 (network) and .1 (server gateway). Skips broadcast address.
func (s *Service) AllocateIP(database *sql.DB) (string, error) {
	_, ipNet, err := net.ParseCIDR(s.Cfg.Subnet)
	if err != nil {
		return "", fmt.Errorf("parse subnet %q: %w", s.Cfg.Subnet, err)
	}

	// Collect used IPs
	rows, err := database.Query(`SELECT wg_ip FROM peers`)
	if err != nil {
		return "", fmt.Errorf("query used IPs: %w", err)
	}
	defer rows.Close()

	used := make(map[string]bool)
	for rows.Next() {
		var ip string
		if err := rows.Scan(&ip); err != nil {
			return "", err
		}
		used[ip] = true
	}
	if err := rows.Err(); err != nil {
		return "", err
	}

	// Walk the subnet starting from .2
	ip := ipNet.IP.To4()
	if ip == nil {
		return "", fmt.Errorf("only IPv4 subnets supported")
	}
	ones, bits := ipNet.Mask.Size()
	hostCount := (1 << (bits - ones)) - 2 // exclude network and broadcast
	base := binary.BigEndian.Uint32(ip)

	for i := 2; i <= hostCount; i++ {
		candidate := make(net.IP, 4)
		binary.BigEndian.PutUint32(candidate, base+uint32(i))
		candidateStr := candidate.String()
		if !used[candidateStr] {
			return candidateStr, nil
		}
	}

	return "", ErrSubnetFull
}
