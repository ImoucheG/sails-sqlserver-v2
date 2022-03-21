# Sails-SqlServer Adapter
SQL Server adapter for the Sails framework and Waterline ORM.  Allows you to use MSSQL via your models to store and retrieve data.  Also
 provides a `sendNativeQuery()` method for a direct interface to execute raw SQL commands.

This adapter use Sails >= v1.0 and use connections pools to manage your requests.
Each pool can stack 5 requests. Theirs stack increase only if others pools is not available (0 request in queu).
He using prepared statement, also he open and close connection from pool automaticaly. The values passed in request are typed for improve
performance and integrity of data.


## Installation

Install from NPM.

```bash
# In your app:
$ npm install sails-sqlserver-v2
```

## Contributing

Please observe the guidelines and conventions laid out in the [Sails project contribution guide](http://sailsjs.com/documentation/contributing) when opening issues or submitting pull requests.

> For more info, see [**Reference > Configuration > sails.config.datastores > The connection URL**](http://sailsjs.com/documentation/reference/configuration/sails-config-datastores#?the-connection-url), or [ask for help](http://sailsjs.com/support).

## License

This adapter, like the [Sails framework](http://sailsjs.com) is free and open-source under the [MIT License](http://sailsjs.com/license).

