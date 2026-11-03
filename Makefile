env:
	cp /keybase/team/cepro_cereal/secrets-dev.env .env

up:
	docker compose -f compose.dev.yml up

prod:
	docker compose -f docker-compose-prod.yml up --build

all: env up