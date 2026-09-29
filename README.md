<p align="center">
    <img src="./public/CEREAL.png" width="400" alt="CEREAL's logo">
</p>
<hr>

## Where am I ?
CEREAL *(or, Cepro Examens Regroupement Encadrement Administration Logistique)* is an application developed by the [CePro] at [EPFL].

In short terms, it's a big application used to manage everything that concerns exams at EPFL.

It is used by students, teachers, assistants, employees, but mainly, exams coordinators (CePro, Repro, SAC, ...)

## Bugs / Features requests
If you found a bug in the application or want to submit a new feature idea, please open an [issue] on this repository.

Your issue have to be clear, concise, and with the correct tags and prefix. If not, it may be refused.

## Table Of Contents
- [Where am I ?](#where-am-i-)
- [Bugs / Features requests](#bugs--features-requests)
- [Table Of Contents](#table-of-contents)
- [Features](#features)
  - [For all users](#for-all-users)
  - [For the Repro](#for-the-repro)
  - [For the SAC](#for-the-sac)
  - [For the admins of the application](#for-the-admins-of-the-application)
- [Technologies](#technologies)
- [How to run ?](#how-to-run-)
- [How to deploy ?](#how-to-deploy-)
- [Contributing](#contributing)
- [Contributors](#contributors)

## Features
### For all users
- Exams registration
- Deferred exams registration & absence submission
- Exams printing registration

### For the Repro
- See the printing calendar
- Manage exams printing status (toPrint, printing, finished, ...)
- Easily manage their printing schedule

### For the SAC
- See all absences and registrations for deferred exams
- Easily open absences files
- Visual way to validate (or not) absences and registrations, making the coordination with the CePro easier.

### For the admins of the application
- See & manage all exams registered to CePro' services
- Validate exams files before being sent for printing to the Repro
- Email notifications for basically everything
- Admin interface
- Impersonation

## Technologies
- [Next.js]
- [MySQL]
- [Docker] for containerization
- [TanStack Table]
- [FullCalendar]
- [Ansible] for deployment, OPS configuration available on [CEREAL.ops]
- [Next-Auth] for authentication & authorization using Entra ID
- [phpMyAdmin] to manage the database visually

## How to run ?
1. Clone this repository
2. Rename the `env.example` file into `.env`
3. Insert your valid data in the `.env` file
4. Run `make up`
5. Go to http://localhost:3000/

## How to deploy ?
If you are meant to deploy the application in test or production, please refer to the Ansible OPS configuration, available on [CEREAL.ops]

## Contributing
If you are willing to contribute to this project in any way, please do ! But respect these few rules first.

1. Your changes have to be made on a specific branch with a clear name, for example `feature/loading-spinner-after-submitting-exams`
2. You have to make a [Pull Request] on the `main` branch.
3. The title & description of the PR must be clear and clean, describing everything about what you did.
4. Assign the PR to the person who is the most likely to review it properly.

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->


[Ansible]: https://docs.ansible.com/
[CePro]: https://cepro.epfl.ch/
[CEREAL.ops]: https://github.com/EPFL-CePro/CEREAL.ops/
[Docker]: https://docker.com/
[EPFL]: https://epfl.ch/
[FullCalendar]: https://fullcalendar.io/
[issue]: https://github.com/EPFL-CePro/CEREAL/issues/new/
[MySQL]: https://mysql.com/
[Next-Auth]: https://next-auth.js.org/
[Next.js]: https://nextjs.org/
[phpMyAdmin]: https://phpmyadmin.net/
[Pull request]: https://github.com/EPFL-CePro/CEREAL/pulls/
[TanStack Table]: https://tanstack.com/table/latest/