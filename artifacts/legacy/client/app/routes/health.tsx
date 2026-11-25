export function loader() {
  try {
    // Todo: make simple query to the database
    return new Response('OK');
  }
  catch (error: unknown) {
    console.error('healthcheck ❌', { error });
    return new Response('ERROR', { status: 500 });
  }
}
