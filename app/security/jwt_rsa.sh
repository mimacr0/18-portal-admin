#!/bin/bash

# Set the key size
KEY_SIZE=4096

# Set the output file names
PRIVATE_KEY="id_rsa.key"
PUBLIC_KEY="id_rsa.pub"

# Generate the private key
openssl genrsa -out $PRIVATE_KEY $KEY_SIZE

# Extract the public key in PEM format
openssl rsa -in $PRIVATE_KEY -pubout -out $PUBLIC_KEY

echo "RSA key pair generated successfully:"
echo "Private key: $PRIVATE_KEY"
echo "Public key: $PUBLIC_KEY"