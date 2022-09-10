# [WIP] Aoede

An audio transport library for discord in NodeJS.

## ⚠ Warning
This library is only for transport and will not support audio encoding/decoding.

## TODO:
- [ ] Aoede main client
- [ ] Gateway
  - [ ] Identify
  - [ ] Heartbeat (keep-alive)
  - [ ] Reconnect/Resume
  - [ ] Select protocol and handle session description
- [ ] UDP
  - [ ] Holepunch
  - [ ] API for sending audio
  - [ ] API for receiving audio
- [ ] Implement encryption modes documented by discord using NaCl libraries for packet encryption/decryption
  - [ ] xsalsa20_poly1305
  - [ ] xsalsa20_poly1305_suffix
  - [ ] xsalsa20_poly1305_lite
- [ ] Events
  - [ ] User connect/disconnect
  - [ ] User speaking start/stop