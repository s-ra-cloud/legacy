{pkgs}: {
  deps = [
    pkgs.nginx
    pkgs.minio-client
    pkgs.minio
    pkgs.redis
    pkgs.unzip
  ];
}
