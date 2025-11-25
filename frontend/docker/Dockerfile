FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake git pkg-config python3 python3-pip \
    curl file sudo vim unzip wget \
    python3 python3-venv gpg

# Add NodeSource for node packages
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
RUN apt update && \
    apt install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Default to an interactive shell if no command is supplied
CMD ["bash"]
