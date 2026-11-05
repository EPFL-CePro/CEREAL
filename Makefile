.PHONY: env up all migration migration-draft db-sync

# Prisma commands run inside the dev app container (MYSQL_HOST=cereal-app-db only resolves on the Docker network),
# as MySQL root: `migrate dev` needs to create a shadow database, and the triggers need privileges the app user lacks.
PRISMA = docker exec -it -w /app -e MYSQL_USER=root -e MYSQL_PASSWORD=secret cereal-app pnpm prisma

env:
	cp /keybase/team/cepro_cereal/secrets-dev.env .env

up:
	docker compose -f compose.dev.yml up

all: env up

# After editing prisma/schema.prisma: creates the migration, applies it to the dev DB and regenerates the client
# Usage: make migration name=add_my_table
migration:
	@test -n "$(name)" || { echo "Usage: make migration name=add_my_table"; exit 1; }
	$(PRISMA) migrate dev --name $(name)
	$(PRISMA) generate

# Same, but only creates the migration file without applying it, to edit it by hand (e.g. to add triggers).
# Then run `make migration name=<same name>` to apply it.
migration-draft:
	@test -n "$(name)" || { echo "Usage: make migration-draft name=add_my_table"; exit 1; }
	$(PRISMA) migrate dev --create-only --name $(name)

# After a `git pull`: applies the migrations of the others to the dev DB and regenerates the client
db-sync:
	$(PRISMA) migrate deploy
	$(PRISMA) generate
