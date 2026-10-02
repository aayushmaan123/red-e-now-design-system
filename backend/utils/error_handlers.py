from flask import jsonify


def register_error_handlers(app):
    # Return JSON when the client requests a route that does not exist
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "The requested resource was not found."
            }
        }), 404

    # Return JSON when the request method is not allowed for a route
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "METHOD_NOT_ALLOWED",
                "message": "That request method is not allowed."
            }
        }), 405

    # Keep unexpected server errors consistent for the frontend
    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Something went wrong on the server."
            }
        }), 500
