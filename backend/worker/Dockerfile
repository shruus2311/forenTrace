FROM python:3.13-alpine@sha256:9ef1a599f863231c3d91e941389bfdc4a2d6070557243d54df1a4e57015b960e
COPY profile.py /opt/forentrace/profile.py
USER 65532:65532
ENTRYPOINT ["python", "-I", "-B", "/opt/forentrace/profile.py"]
