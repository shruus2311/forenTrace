FROM busybox:1.37-musl AS probe
RUN mkdir /storage

FROM cgr.dev/chainguard/minio@sha256:16b824a0016ffad3dfa8b059755f83800aa42ca68fe86f1782cabd0c5a16d322
COPY --from=probe /bin/busybox /usr/local/bin/busybox
COPY --from=probe --chown=65532:65532 /storage /data
