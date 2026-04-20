# Per-contributor attestation template

Each contributor publishes one of these within 24h of completing their turn,
signed with the same SSH-Ed25519 key listed for them in `CONTRIBUTORS.md`
(namespace `veilrail-ceremony-v1`). The attestation MUST be linked from
`TRANSCRIPT.md` (under the line that records the contributor's `.ptau` /
`.zkey` hash) and mirrored at
`artifacts/veilrail/public/ceremony/attestations/<NN>-<handle>.{txt,sig}`.

Replace every `<...>` placeholder with a real value. Do not edit the
surrounding wording: third-party verifiers grep for the literal field
names.

```
-----BEGIN ATTESTATION-----
ceremony:        VeilRail mainnet trusted setup
phase:           <1 | 2:veil_auth | 2:veil_completion | 2:veil_pool_note>
contribution:    <NNNN, e.g. 0003>
contributor:     <handle as in CONTRIBUTORS.md, e.g. dry-run-1>
ssh-fingerprint: <SHA256:... as in CONTRIBUTORS.md>

input-file:      <previous filename, e.g. pot18_0002.ptau>
input-sha256:    <sha256 of the file you received>
output-file:     <filename you produced, e.g. pot18_0003.ptau>
output-sha256:   <sha256 of the file you produced>

host:            <one-line description: OS, kernel, CPU, RAM>
network:         <"airgapped" | "isolated VLAN, no inbound" | ... >
randomness:      <human-readable description of entropy source(s) you fed
                  into snarkjs, e.g. "/dev/urandom + 32 bytes from a YubiKey
                  challenge-response + 16 dice rolls">
toxic-waste:     destroyed by <method, e.g. "shred -u + zeroing the LUKS
                  volume + physical destruction of the SSD">
performed-at:    <ISO-8601 UTC timestamp>

I attest that:
- I am the human identified above and I personally ran the contribution.
- The randomness was generated locally and never left this host.
- The toxic waste described above was destroyed before this attestation
  was signed, and no copy of it exists in any backup, snapshot, or paging
  file under my control.
- I commit to the beacon source published in BEACON.md.
- I have not contributed under any other identity in this ceremony.
-----END ATTESTATION-----
```

After filling the block in, sign it with the same SSH-Ed25519 key that
signed `CONTRIBUTORS.md`:

```
ssh-keygen -Y sign \
  -f <handle>_ed25519 \
  -n veilrail-ceremony-v1 \
  <NN>-<handle>.txt
# produces <NN>-<handle>.txt.sig
mv <NN>-<handle>.txt.sig <NN>-<handle>.sig
```

Publish both `<NN>-<handle>.txt` and `<NN>-<handle>.sig` to the
attestations directory. Anyone can re-verify with the same
`allowed_signers` file used for `CONTRIBUTORS.md`:

```
ssh-keygen -Y verify \
  -f allowed_signers \
  -I <handle>@veilrail-ceremony-v1 \
  -n veilrail-ceremony-v1 \
  -s <NN>-<handle>.sig \
  < <NN>-<handle>.txt
```
