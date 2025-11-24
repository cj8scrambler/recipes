#!/bin/bash
#
# Tag docker images with current git tag

LAST_TAG=$(git describe --tags --abbrev=0)
if [[ ${LAST_TAG} == $(git describe --tags) ]]
then
  if [[ -n $(git status --porcelain) ]]
  then
    echo "Error: git repository is not clean"
    exit 1
  fi
  VERSION_TAG="${LAST_TAG}"
else
  echo "Error: Current commit is not on a git tag"
  exit 1
fi

# Make sure images match current definition
docker compose build

for BASE_IMAGE_TAG in $(docker compose config --images)
do
echo "BASE_IMAGE_TAG: ${BASE_IMAGE_TAG}"
  IMAGE=$(echo ${BASE_IMAGE_TAG} | cut -d':' -f1)
  NEW_TAG="${IMAGE}:$VERSION_TAG"
  docker tag "${IMAGE}" "${NEW_TAG}"
  echo "Tagged docker image '${SERVICE}' as '${VERSION_TAG}'"
done
